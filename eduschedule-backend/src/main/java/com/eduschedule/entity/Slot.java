package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@Data
@NoArgsConstructor
@Builder
@AllArgsConstructor
@Table(
        name = "slots",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"timetable_id", "day", "period"})}
)
public class Slot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "timetable_id")
    private Timetable timetable;

    @ManyToOne
    @JoinColumn(name = "assignment_id")
    private Assignment assignment;

    private Integer day;
    private Integer period;
}
