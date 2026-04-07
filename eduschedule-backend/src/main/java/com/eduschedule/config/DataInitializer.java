package com.eduschedule.config;

import com.eduschedule.entity.User;
import com.eduschedule.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String defaultUsername;

    @Value("${app.admin.password}")
    private String defaultPassword;

    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.findByUsername(defaultUsername).isPresent()) {
            User admin = User.builder()
                    .username(defaultUsername)
                    .password(passwordEncoder.encode(defaultPassword))
                    .isFirstLogin(true)
                    .build();
            userRepository.save(admin);
            System.out.println("----------------------------------------");
            System.out.println(">>> INITIALIZE ADMIN ACCOUNT");
            System.out.printf(">>> Username: %s", defaultUsername);
            System.out.println("----------------------------------------");
        }
    }
}
