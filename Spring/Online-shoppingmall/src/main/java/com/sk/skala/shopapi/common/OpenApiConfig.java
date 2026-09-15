package com.sk.skala.shopapi.common;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import jakarta.servlet.http.HttpServletRequest;
import org.springdoc.core.properties.SwaggerUiConfigParameters;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.core.providers.ObjectMapperProvider;
import org.springdoc.webmvc.ui.SwaggerIndexPageTransformer;
import org.springdoc.webmvc.ui.SwaggerIndexTransformer;
import org.springdoc.webmvc.ui.SwaggerWelcomeCommon;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.resource.ResourceTransformerChain;
import org.springframework.web.servlet.resource.TransformedResource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI shopOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("AI Shopping Mall API")
                        .description("상품, 고객, 주문, 재고 및 판매 통계를 제공하는 쇼핑몰 REST API")
                        .version("1.0.0"));
    }

    @Bean
    public SwaggerIndexTransformer customSwaggerIndexTransformer(
            SwaggerUiConfigProperties configProperties,
            SwaggerUiOAuthProperties oauthProperties,
            SwaggerUiConfigParameters configParameters,
            SwaggerWelcomeCommon swaggerWelcome,
            ObjectMapperProvider objectMapperProvider) {

        return new SwaggerIndexPageTransformer(
                configProperties, oauthProperties, configParameters, swaggerWelcome, objectMapperProvider) {
            @Override
            public Resource transform(
                    HttpServletRequest request,
                    Resource resource,
                    ResourceTransformerChain transformerChain) throws IOException {
                Resource transformed = super.transform(request, resource, transformerChain);
                if (!"index.html".equals(resource.getFilename())) {
                    return transformed;
                }

                String html = new String(transformed.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                        .replace("</head>", """
                                <link rel="icon" href="/swagger-custom/logo.svg">
                                <link rel="stylesheet" href="/swagger-custom/custom.css">
                                </head>""")
                        .replace("</body>", """
                                <script src="/swagger-custom/custom.js"></script>
                                </body>""");
                return new TransformedResource(transformed, html.getBytes(StandardCharsets.UTF_8));
            }
        };
    }
}
