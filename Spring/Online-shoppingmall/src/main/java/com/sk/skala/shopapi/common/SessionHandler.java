package com.sk.skala.shopapi.common;

import com.sk.skala.shopapi.exception.ErrorCode;
import com.sk.skala.shopapi.exception.ResponseException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Arrays;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SessionHandler {
    private static final String COOKIE_NAME = "bff-access";

    private final HttpServletRequest request;
    private final HttpServletResponse response;
    private final Key signingKey;
    private final long expiration;

    public SessionHandler(
            HttpServletRequest request,
            HttpServletResponse response,
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration) {
        this.request = request;
        this.response = response;
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public void createSession(String customerId) {
        Date now = new Date();
        String token = Jwts.builder()
                .setSubject(customerId)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expiration))
                .signWith(signingKey)
                .compact();

        Cookie cookie = new Cookie(COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) (expiration / 1000));
        response.addCookie(cookie);
    }

    public String getCurrentCustomerId() {
        try {
            Cookie[] cookies = request.getCookies();
            if (cookies == null) {
                throw notAuthenticated();
            }
            String token = Arrays.stream(cookies)
                    .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElseThrow(this::notAuthenticated);

            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getSubject();
        } catch (ResponseException exception) {
            throw exception;
        } catch (Exception exception) {
            throw notAuthenticated();
        }
    }

    public String getOptionalCustomerId() {
        try {
            return getCurrentCustomerId();
        } catch (ResponseException exception) {
            return null;
        }
    }

    private ResponseException notAuthenticated() {
        return new ResponseException(ErrorCode.NOT_AUTHENTICATED, "로그인이 필요합니다.");
    }
}
