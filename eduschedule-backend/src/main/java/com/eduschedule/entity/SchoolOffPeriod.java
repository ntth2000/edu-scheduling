package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "school_off_periods",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"day", "period"}
        )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolOffPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer day;

    @Column(nullable = false)
    private Integer period;

    private String description;
}