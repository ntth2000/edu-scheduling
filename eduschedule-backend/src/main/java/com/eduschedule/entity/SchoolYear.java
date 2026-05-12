package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@Table(name = "school_years")
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

    @Column(nullable = false, unique = true, length = 10)
    private String name;

    @Column(nullable = false, unique = true)
    private Integer startYear;

    @Column(nullable = false, unique = true)
    private Integer endYear;

}
