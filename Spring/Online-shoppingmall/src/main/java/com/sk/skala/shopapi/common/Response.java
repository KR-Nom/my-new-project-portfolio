package com.sk.skala.shopapi.common;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class Response<T> {
    private boolean success;
    private String code;
    private String message;
    private T body;

    public static <T> Response<T> ok(T body) {
        return new Response<>(true, "OK", "요청이 성공했습니다.", body);
    }

    public static <T> Response<T> ok(String message, T body) {
        return new Response<>(true, "OK", message, body);
    }

    public static <T> Response<T> fail(String code, String message) {
        return new Response<>(false, code, message, null);
    }
}
