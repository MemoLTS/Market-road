package com.marketroad.soporte.dto;

public record LoginResponseDTO(String token, long expiraEnMs, PersonalDTO personal) {}
