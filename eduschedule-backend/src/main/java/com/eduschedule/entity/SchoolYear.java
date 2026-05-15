package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@Table(
    name = "school_years",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "start_year"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolYear {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer startYear;

}
