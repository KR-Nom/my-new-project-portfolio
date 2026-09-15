package com.sk.skala.shopapi.service;

import com.sk.skala.shopapi.common.PagedList;
import com.sk.skala.shopapi.common.Response;
import com.sk.skala.shopapi.data.dto.ProductRankingDto;
import com.sk.skala.shopapi.data.table.Product;
import com.sk.skala.shopapi.common.SessionHandler;
import com.sk.skala.shopapi.exception.ErrorCode;
import com.sk.skala.shopapi.exception.ParameterException;
import com.sk.skala.shopapi.exception.ResponseException;
import com.sk.skala.shopapi.repository.ProductRepository;
import com.sk.skala.shopapi.repository.SalesHistoryRepository;
import java.util.List;
import com.sk.skala.shopapi.tools.StringUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final RecentlyViewedProductService recentlyViewedProductService;
    private final SalesHistoryRepository salesHistoryRepository;
    private final SessionHandler sessionHandler;

    public Response<PagedList<Product>> getAllProducts(int offset, int count) {
        validatePage(offset, count);
        Page<Product> productPage = productRepository.findAll(
                PageRequest.of(offset, count, Sort.by("id").ascending()));
        return Response.ok(new PagedList<>(
                productPage.getContent(), offset, count,
                productPage.getTotalElements(), productPage.getTotalPages()));
    }

    @Transactional
    public Response<Product> getProductById(Long id) {
        if (id == null) {
            throw new ParameterException("id");
        }
        Product productEntity = findProduct(id);
        recentlyViewedProductService.recordView(sessionHandler.getOptionalCustomerId(), productEntity);
        return Response.ok(productEntity);
    }

    public Response<Product> createProduct(Product productEntity) {
        validateProduct(productEntity, false);
        productRepository.findByProductName(productEntity.getProductName())
                .ifPresent(existing -> {
                    throw new ResponseException(ErrorCode.DATA_DUPLICATED, "이미 등록된 상품명입니다.");
                });
        productEntity.setId(null);
        if (productEntity.getStockQuantity() == null) productEntity.setStockQuantity(0);
        return Response.ok("상품이 등록되었습니다.", productRepository.save(productEntity));
    }

    public Response<Product> updateProduct(Product productEntity) {
        validateProduct(productEntity, true);
        Product existing = findProduct(productEntity.getId());
        productRepository.findByProductName(productEntity.getProductName())
                .filter(found -> !found.getId().equals(productEntity.getId()))
                .ifPresent(found -> {
                    throw new ResponseException(ErrorCode.DATA_DUPLICATED, "이미 등록된 상품명입니다.");
                });
        existing.setProductName(productEntity.getProductName());
        existing.setProductPrice(productEntity.getProductPrice());
        if (productEntity.getStockQuantity() != null) existing.setStockQuantity(productEntity.getStockQuantity());
        return Response.ok("상품이 수정되었습니다.", productRepository.save(existing));
    }

    @Transactional(readOnly = true)
    public Response<List<Product>> getLowStock(Integer threshold) {
        if (threshold == null) threshold = 5;
        if (threshold < 0) throw new ParameterException("threshold");
        return Response.ok(productRepository.findByStockQuantityLessThanEqualAndStockQuantityGreaterThanOrderByStockQuantityAscIdAsc(threshold, 0));
    }

    @Transactional(readOnly = true)
    public Response<List<ProductRankingDto>> getRankings(Integer limit) {
        if (limit == null) limit = 5;
        if (limit < 1) throw new ParameterException("limit");
        List<ProductRankingDto> rankingList = salesHistoryRepository.findNetSales().stream().limit(limit).map(row -> {
            Long productId = ((Number) row[0]).longValue();
            Double productPrice = ((Number) row[2]).doubleValue();
            Long quantity = ((Number) row[3]).longValue();
            return new ProductRankingDto(productId, (String) row[1], quantity, productPrice * quantity, 0);
        }).toList();
        List<ProductRankingDto> rankedProducts = new java.util.ArrayList<>();
        for (int index = 0; index < rankingList.size(); index++) {
            ProductRankingDto ranking = rankingList.get(index);
            rankedProducts.add(new ProductRankingDto(ranking.getProductId(), ranking.getProductName(),
                    ranking.getTotalSalesQuantity(), ranking.getTotalSalesAmount(), index + 1));
        }
        return Response.ok(rankedProducts);
    }


    public Response<Void> deleteProduct(Long id) {
        if (id == null) {
            throw new ParameterException("id");
        }
        productRepository.delete(findProduct(id));
        return Response.ok("상품이 삭제되었습니다.", null);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseException(
                        ErrorCode.DATA_NOT_FOUND, "상품을 찾을 수 없습니다."));
    }

    public Product getProductEntity(Long id) {
        if (id == null) throw new ParameterException("id");
        return findProduct(id);
    }

    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    private void validateProduct(Product product, boolean idRequired) {
        if (product == null) {
            throw new ParameterException("product");
        }
        if (idRequired && product.getId() == null) {
            throw new ParameterException("id");
        }
        if (StringUtil.isAnyEmpty(product.getProductName())) {
            throw new ParameterException("productName");
        }
        if (product.getProductPrice() == null || product.getProductPrice() <= 0) {
            throw new ParameterException("productPrice");
        }
        if (product.getStockQuantity() != null && product.getStockQuantity() < 0) {
            throw new ParameterException("stockQuantity");
        }
    }


    private void validatePage(int offset, int count) {
        if (offset < 0) {
            throw new ParameterException("offset");
        }
        if (count < 1) {
            throw new ParameterException("count");
        }
    }
}
