package com.sk.skala.shopapi.common;

import com.sk.skala.shopapi.repository.ProductRepository;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

/** Keep persisted stock and orders untouched when restarting the local profile. */
@Component
@Profile("local")
@RequiredArgsConstructor
public class LocalProductSeed implements ApplicationRunner {
    private final ProductRepository productRepository;
    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        if (productRepository.count() == 0) {
            new ResourceDatabasePopulator(new ClassPathResource("data.sql")).execute(dataSource);
        }
    }
}
