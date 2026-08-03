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

    // Đóng băng tên GV/môn tại thời điểm công bố (publish) — chỉ được đọc khi
    // week.isPublished()==true, xem TimetableService#publish và
    // SlotService/PublicTimetableService#toResponse. Giữ Assignment sống ở
    // trên làm nguồn cho ràng buộc/tiến độ; các cột này chỉ phục vụ hiển thị
    // để tuần đã công bố không đổi theo khi phân công bị sửa sau đó.
    @Column(name = "teacher_id_snapshot")
    private Long teacherIdSnapshot;

    @Column(name = "teacher_name_snapshot")
    private String teacherNameSnapshot;

    @Column(name = "subject_name_snapshot")
    private String subjectNameSnapshot;
}
