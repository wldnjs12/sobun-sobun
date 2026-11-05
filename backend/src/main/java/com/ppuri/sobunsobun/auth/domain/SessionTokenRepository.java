package com.ppuri.sobunsobun.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionTokenRepository extends JpaRepository<SessionToken, String> {
}
