package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = false;

    @Column(name = "public_token", unique = true)
    private String publicToken;

    @OneToMany(mappedBy = "timetable", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("weekNumber ASC")
    @Builder.Default
    private List<Week> weeks = new ArrayList<>();
}
