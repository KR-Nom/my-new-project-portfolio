package com.sk.skala.shopapi.exception;

import lombok.Getter;

@Getter
public class ParameterException extends RuntimeException {
    private final String parameterName;

    public ParameterException(String parameterName) {
        super(parameterName + " 파라미터가 올바르지 않습니다.");
        this.parameterName = parameterName;
    }
}
