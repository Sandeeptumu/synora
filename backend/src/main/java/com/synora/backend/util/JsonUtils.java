package com.synora.backend.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;

public final class JsonUtils {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }

    public static <T> List<T> toList(String json, Class<T> elementType) {
        try {
            return MAPPER.readValue(json, new TypeReference<List<T>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
