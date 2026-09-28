package com.sk.skala.shopapi;

import static org.assertj.core.api.Assertions.assertThat;
import com.sk.skala.shopapi.common.PasswordHasher;
import org.junit.jupiter.api.Test;

class PasswordHasherTest {
    private final PasswordHasher hasher = new PasswordHasher();

    @Test
    void samePasswordHasDistinctSaltedHashes() {
        String first = hasher.hash("example-password");
        String second = hasher.hash("example-password");
        assertThat(first).isNotEqualTo(second).doesNotContain("example-password");
        assertThat(hasher.matches("example-password", first)).isTrue();
        assertThat(hasher.matches("example-password", second)).isTrue();
    }

    @Test
    void incorrectPasswordIsRejected() {
        assertThat(hasher.matches("incorrect", hasher.hash("correct-password"))).isFalse();
    }

    @Test
    void plaintextAndMalformedStoredValuesAreRejected() {
        assertThat(hasher.matches("legacy-password", "legacy-password")).isFalse();
        assertThat(hasher.matches("password", "pbkdf2-sha256$bad$value")).isFalse();
        assertThat(hasher.matches("password", null)).isFalse();
    }
}
