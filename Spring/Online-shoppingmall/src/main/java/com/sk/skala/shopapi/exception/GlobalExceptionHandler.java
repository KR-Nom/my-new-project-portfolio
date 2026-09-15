package com.sk.skala.shopapi.exception;

import com.sk.skala.shopapi.common.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("입력값이 올바르지 않습니다.");
        return ResponseEntity.badRequest()
                .body(Response.fail(ErrorCode.INVALID_PARAMETER.name(), message));
    }

    @ExceptionHandler(ResponseException.class)
    public ResponseEntity<Response<Void>> handleResponseException(ResponseException exception) {
        HttpStatus status = switch (exception.getErrorCode()) {
            case NOT_AUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case DATA_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DATA_DUPLICATED -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status)
                .body(Response.fail(exception.getErrorCode().name(), exception.getMessage()));
    }

    @ExceptionHandler(ParameterException.class)
    public ResponseEntity<Response<Void>> handleParameterException(ParameterException exception) {
        return ResponseEntity.badRequest()
                .body(Response.fail(ErrorCode.INVALID_PARAMETER.name(), exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Response<Void>> handleUnexpectedException(Exception exception) {
        return ResponseEntity.internalServerError()
                .body(Response.fail("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."));
    }
}
