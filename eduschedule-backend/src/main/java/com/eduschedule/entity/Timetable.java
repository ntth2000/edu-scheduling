package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "timetables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timetable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // optional label

    @Column(nullable = false)
    private String status; // DRAFT, PUBLISHED

    private LocalDateTime publishedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
