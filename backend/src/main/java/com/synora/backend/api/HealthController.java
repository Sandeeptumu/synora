package com.synora.backend.api;

import com.synora.backend.ai.AIRouter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Public lightweight health endpoint (used by the landing page AI status indicator).
 */
@RestController
public class HealthController {

    private final AIRouter aiRouter;
    private final DataSource dataSource;

    public HealthController(AIRouter aiRouter, DataSource dataSource) {
        this.aiRouter = aiRouter;
        this.dataSource = dataSource;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        // Health must never throw: any failure degrades the reported status instead.
        boolean dbOk = false;
        try (Connection conn = dataSource.getConnection()) {
            dbOk = conn != null && conn.isValid(2);
        } catch (Exception ignored) {}
        boolean aiOnline;
        try {
            aiOnline = aiRouter.ollamaOnline();
        } catch (Exception e) {
            aiOnline = false;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", "UP");
        out.put("service", "synora-backend");
        out.put("database", dbOk ? "connected" : "disconnected");
        out.put("services", java.util.Arrays.asList(
                Map.of("name", "Backend API", "status", "OPERATIONAL"),
                Map.of("name", "AI Engine", "status",
                        aiOnline ? "OPERATIONAL" : "DEMO_MODE"),
                Map.of("name", "Database", "status", dbOk ? "CONNECTED" : "DISCONNECTED")));
        out.put("aiProvider", aiOnline ? "ollama" : "demo");
        out.put("demoMode", !aiOnline);
        out.put("timestamp", Instant.now().toString());
        return out;
    }
}
