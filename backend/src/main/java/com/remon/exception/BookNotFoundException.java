package com.remon.exception;

public class BookNotFoundException extends BusinessException {
    public BookNotFoundException(Long bookId) {
        super(ErrorCode.BOOK_NOT_FOUND, ErrorCode.BOOK_NOT_FOUND.getDefaultMessage() + " id=" + bookId);
    }
}
