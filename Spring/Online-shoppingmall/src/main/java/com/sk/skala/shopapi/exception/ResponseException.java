package com.sk.skala.shopapi.exception;

import lombok.Getter;

@Getter
public class ResponseException extends RuntimeException {
    private final ErrorCode errorCode;

    public ResponseException(ErrorCode errorCode) {
        this(errorCode, errorCode.name());
    }

    public ResponseException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
