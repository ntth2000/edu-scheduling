package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "timetables",
    uniqueConstraints = @UniqueConstraint(columnNames = {"school_year_id", "semester_order"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timetable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "school_year_id", nullable = false)
    private SchoolYear schoolYear;

    @Column(name = "semester_order", nullable = false)
    private Integer semesterOrder;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "off_day")
    private Integer offDay;

    @Column(name = "off_session")
    private Integer offSession;

    private LocalDateTime publishedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
