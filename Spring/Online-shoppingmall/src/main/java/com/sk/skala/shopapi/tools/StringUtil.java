package com.sk.skala.shopapi.tools;

public final class StringUtil {

    private StringUtil() {
    }

    public static boolean isAnyEmpty(String... values) {
        if (values == null) {
            return true;
        }
        for (String value : values) {
            if (value == null || value.trim().isEmpty()) {
                return true;
            }
        }
        return false;
    }
}
