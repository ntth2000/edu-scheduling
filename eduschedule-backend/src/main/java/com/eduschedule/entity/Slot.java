package com.eduschedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
@Table(
    name = "slots",
    uniqueConstraints = @UniqueConstraint(columnNames = {"week_id", "assignment_id", "day", "session", "period"})
)
public class Slot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "week_id", nullable = false)
    private Week week;

    @ManyToOne
    @JoinColumn(name = "assignment_id")
    private Assignment assignment;

    @ManyToOne
    @JoinColumn(name = "special_room_id")
    private SpecialRoom specialRoom;

    private Integer day;
    private Integer session;
    private Integer period;
}
