package com.ppuri.sobunsobun.auth.dto;

import com.ppuri.sobunsobun.auth.domain.Building;

public record BuildingRegisterResponse(Long buildingId, String name, String dong) {

    public static BuildingRegisterResponse from(Building building) {
        return new BuildingRegisterResponse(building.getId(), building.getName(), building.getDong());
    }
}
