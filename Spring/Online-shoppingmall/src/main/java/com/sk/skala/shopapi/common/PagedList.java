package com.sk.skala.shopapi.common;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PagedList<T> {
    private List<T> items;
    private int offset;
    private int count;
    private long totalElements;
    private int totalPages;
}
