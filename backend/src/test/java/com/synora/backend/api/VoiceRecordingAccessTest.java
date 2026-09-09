package com.synora.backend.api;
import com.synora.backend.monitoring.*;
import com.synora.backend.casehub.*;
import com.synora.backend.user.*;
import com.synora.backend.audit.AuditService;
import com.synora.backend.exception.ApiException;
import org.junit.jupiter.api.*;
import org.mockito.*;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class VoiceRecordingAccessTest {
 @Mock VoiceRecordingRepository recordingRepo;
 @Mock CaseService caseService;
 @Mock UserService userService;
 @Mock ConsentRepository consentRepo;
 @Mock AuditService audit;
 @Mock com.synora.backend.engine.MonitoringOrchestrationService orchestration;
 @InjectMocks MonitoringController controller;
 AutoCloseable mocks;
 User owner, counselor, actor;
 Case c;
 UUID id=UUID.randomUUID();
 @BeforeEach void setup() {
  mocks=MockitoAnnotations.openMocks(this);
  owner=mock(User.class); counselor=mock(User.class); c=mock(Case.class);
  when(owner.getId()).thenReturn(UUID.randomUUID()); when(counselor.getId()).thenReturn(UUID.randomUUID());
  when(counselor.getRole()).thenReturn("COUNSELOR"); when(owner.getRole()).thenReturn("VICTIM");
  when(c.getVictim()).thenReturn(owner); when(c.getAssignedCounselor()).thenReturn(counselor);
  when(c.getId()).thenReturn(UUID.randomUUID()); when(c.getCaseNumber()).thenReturn("CASE-1");
  when(caseService.requireByNumber("CASE-1")).thenReturn(c);
  SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("actor", ""));
  when(userService.requireByPrincipal("actor")).thenAnswer(i -> actor);
  Consent consent=new Consent(); consent.setGranted(true);
  when(consentRepo.findFirstByUserIdAndModalityOrderByCreatedAtDesc(owner.getId(), "VOICE_ANALYSIS")).thenReturn(Optional.of(consent));
  actor=counselor;
 }
 @AfterEach void cleanup() throws Exception { SecurityContextHolder.clearContext(); mocks.close(); }
 VoiceRecording saved(Case linked) {
  CheckIn ci=mock(CheckIn.class); when(ci.getCaseRef()).thenReturn(linked);
  VoiceRecording v=new VoiceRecording(ci,new byte[]{1,2,3},"audio/mp4");
  when(recordingRepo.findById(id)).thenReturn(Optional.of(v)); return v;
 }
 @Test void assignedCounselorGetsAudioWithCorrectTypeAndNoCache() {
  saved(c); var response=controller.recording("CASE-1",id);
  assertArrayEquals(new byte[]{1,2,3},response.getBody());
  assertEquals("audio/mp4",response.getHeaders().getContentType().toString());
  assertTrue(response.getHeaders().getCacheControl().contains("no-store"));
  verify(audit).log(eq("VOICE_RECORDING_ACCESSED"),eq("CASE"),anyString());
 }
 @Test void ownerCanListen() { actor=owner; saved(c); assertEquals(200,controller.recording("CASE-1",id).getStatusCode().value()); }
 @Test void unrelatedCounselorCannotListen() {
  actor=mock(User.class); when(actor.getId()).thenReturn(UUID.randomUUID()); when(actor.getRole()).thenReturn("COUNSELOR");
  assertEquals(HttpStatus.FORBIDDEN,assertThrows(ApiException.class,()->controller.recording("CASE-1",id)).getStatus());
  verifyNoInteractions(recordingRepo);
 }
 @Test void officerCannotListen() {
  actor=mock(User.class); when(actor.getId()).thenReturn(UUID.randomUUID()); when(actor.getRole()).thenReturn("CASE_OFFICER");
  assertThrows(ApiException.class,()->controller.recording("CASE-1",id)); verifyNoInteractions(recordingRepo);
 }
 @Test void revokedConsentBlocksPlayback() {
  when(consentRepo.findFirstByUserIdAndModalityOrderByCreatedAtDesc(owner.getId(),"VOICE_ANALYSIS")).thenReturn(Optional.empty());
  assertThrows(ApiException.class,()->controller.recording("CASE-1",id)); verifyNoInteractions(recordingRepo);
 }
 @Test void recordingFromAnotherCaseIsRejected() {
  Case other=mock(Case.class); when(other.getId()).thenReturn(UUID.randomUUID()); saved(other);
  assertEquals(HttpStatus.NOT_FOUND,assertThrows(ApiException.class,()->controller.recording("CASE-1",id)).getStatus());
 }
 @Test void invalidUploadIsRejected() {
  actor=owner;
  assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ApiException.class,()->controller.analyzeVoice("CASE-1",null,null,null,null,new MockMultipartFile("file","bad.html","text/html",new byte[]{1}))).getStatus());
 }
 @Test void uploadPersistsExactAudioBytes() {
  actor=owner;
  byte[] bytes={8,4,3,2};
  var file=new MockMultipartFile("file","check-in.m4a","audio/mp4",bytes);
  CheckIn ci=mock(CheckIn.class); when(ci.getId()).thenReturn(id);
  RiskAssessment risk=mock(RiskAssessment.class);
  var result=mock(com.synora.backend.engine.MonitoringOrchestrationService.PipelineResult.class);
  when(result.checkIn()).thenReturn(ci); when(result.riskAssessment()).thenReturn(risk);
  when(orchestration.runPipeline(c,null,file,null,null,null)).thenReturn(result);
  when(result.baseline()).thenReturn(new com.synora.backend.engine.BaselineEngine.BaselineResult(0,0,0,"steady"));
  when(result.temporal()).thenReturn(new com.synora.backend.engine.TemporalEngine.TemporalResult(0,0,0,"STABLE",0));
  when(result.cross()).thenReturn(new com.synora.backend.engine.CrossSensingEngine.CrossSensingResult(0,"LOW",0,1));
  var output=mock(com.synora.backend.engine.RiskEngine.RiskOutput.class);
  when(output.factors()).thenReturn(List.of()); when(result.riskOutput()).thenReturn(output);
  controller.analyzeVoice("CASE-1",null,null,null,null,file);
  var captor=ArgumentCaptor.forClass(VoiceRecording.class);
  verify(recordingRepo).save(captor.capture());
  assertArrayEquals(bytes,captor.getValue().getAudio());
  assertEquals("audio/mp4",captor.getValue().getContentType());
  assertSame(ci,captor.getValue().getCheckIn());
 }
 @Test void oversizedUploadIsRejectedBeforeAnalysis() {
  actor=owner;
  var file=mock(org.springframework.web.multipart.MultipartFile.class);
  when(file.getContentType()).thenReturn("audio/mp4"); when(file.getSize()).thenReturn(11L*1024*1024);
  assertThrows(ApiException.class,()->controller.analyzeVoice("CASE-1",null,null,null,null,file));
  verifyNoInteractions(orchestration,recordingRepo);
 }

}
