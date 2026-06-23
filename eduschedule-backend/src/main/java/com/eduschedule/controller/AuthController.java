package com.eduschedule.controller;

import com.eduschedule.dto.request.LoginRequest;
import com.eduschedule.dto.request.RegisterRequest;
import com.eduschedule.dto.response.LoginResponse;
import com.eduschedule.dto.response.RegisterResponse;
import com.eduschedule.entity.RefreshToken;
import com.eduschedule.entity.User;
import com.eduschedule.repository.RefreshTokenRepository;
import com.eduschedule.repository.UserRepository;
import com.eduschedule.service.DefaultSubjectSeeder;
import com.eduschedule.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final DefaultSubjectSeeder defaultSubjectSeeder;

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên đăng nhập đã tồn tại");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();
        userRepository.save(user);

        defaultSubjectSeeder.seedForUser(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse(user.getUsername(), "Đăng ký thành công"));
    }

    @Transactional
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Tên đăng nhập chưa được đăng ký"));
        }
        User user = userOpt.get();

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Tên đăng nhập hoặc mật khẩu không đúng"));
        }

        // Invalidate any existing refresh tokens for this user
        refreshTokenRepository.deleteByUser(user);

        String accessToken = jwtService.generateAccessToken(user.getUsername());
        String rawRefreshToken = jwtService.generateRefreshToken(user.getUsername());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(rawRefreshToken)
                .expiresAt(Instant.now().plusMillis(jwtService.getRefreshExpiration()))
                .build();
        refreshTokenRepository.save(refreshToken);

        return ResponseEntity.ok(new LoginResponse(accessToken, rawRefreshToken, user.getUsername()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String rawToken = body.get("refreshToken");
        if (rawToken == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu refreshToken");
        }

        RefreshToken stored = refreshTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(stored);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token đã hết hạn");
        }

        // Rotate: delete old, issue new
        refreshTokenRepository.delete(stored);

        String username = stored.getUser().getUsername();
        String newAccessToken = jwtService.generateAccessToken(username);
        String newRawRefreshToken = jwtService.generateRefreshToken(username);

        RefreshToken newRefreshToken = RefreshToken.builder()
                .user(stored.getUser())
                .token(newRawRefreshToken)
                .expiresAt(Instant.now().plusMillis(jwtService.getRefreshExpiration()))
                .build();
        refreshTokenRepository.save(newRefreshToken);

        return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "refreshToken", newRawRefreshToken
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        String rawToken = extractCookie(request, "refresh_token");
        if (rawToken != null) {
            refreshTokenRepository.findByToken(rawToken).ifPresent(refreshTokenRepository::delete);
        }
        return ResponseEntity.noContent().build();
    }

    private String extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
