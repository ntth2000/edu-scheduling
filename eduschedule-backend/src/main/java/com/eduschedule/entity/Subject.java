package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Setter
@Getter
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "subjects")
public class Subject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String shortName;

    private Integer periodsGrade1 = 0;
    private Integer periodsGrade2 = 0;
    private Integer periodsGrade3 = 0;
    private Integer periodsGrade4 = 0;
    private Integer periodsGrade5 = 0;
}
