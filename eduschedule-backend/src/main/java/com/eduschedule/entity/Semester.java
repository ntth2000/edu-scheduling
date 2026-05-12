package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@Table(
    name = "semesters",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"school_year_id", "semester_order"})
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Semester {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "school_year_id", nullable = false)
    private SchoolYear schoolYear;

    @Column(name = "semester_order", nullable = false, columnDefinition = "int CHECK (semester_order IN (1, 2))")
    private Integer semesterOrder;
}
