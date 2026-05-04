package com.remon.book.repository;

import com.remon.book.entity.Book;
import com.remon.book.entity.BookStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {

    @Query("""
            SELECT b FROM Book b
            WHERE LOWER(b.title)       LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(b.author)      LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(b.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    List<Book> searchByKeyword(@Param("keyword") String keyword);

    @Query("""
            SELECT b FROM Book b
            WHERE LOWER(b.title)       LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(b.author)      LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(b.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    Page<Book> searchByKeywordPageable(@Param("keyword") String keyword, Pageable pageable);

    Page<Book> findAll(Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.publishedBy = :userId AND b.isAiGenerated = true ORDER BY b.publishedDate DESC")
    List<Book> findMyGeneratedBooks(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.status = :status WHERE b.id = :id")
    void updateStatus(@Param("id") Long id, @Param("status") BookStatus status);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.title = :title, b.content = :content, b.status = :status WHERE b.id = :id")
    void updateGenerationResult(@Param("id") Long id, @Param("title") String title,
                                @Param("content") String content, @Param("status") BookStatus status);

    @Query("SELECT b FROM Book b WHERE b.isPublic = true AND (b.isAiGenerated = false OR b.status = 'DONE') ORDER BY b.publishedDate DESC")
    List<Book> findPublicBooks();

    @Query("SELECT b FROM Book b WHERE b.isPublic = true AND (b.isAiGenerated = false OR b.status = 'DONE') AND b.publishedBy IN :userIds ORDER BY b.publishedDate DESC")
    List<Book> findFeedBooks(@Param("userIds") List<Long> userIds);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.author = :newNickname WHERE b.publishedBy = :userId")
    void updateAuthorByPublishedBy(@Param("userId") Long userId, @Param("newNickname") String newNickname);
}