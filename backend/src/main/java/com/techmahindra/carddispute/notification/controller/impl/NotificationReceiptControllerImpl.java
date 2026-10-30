package com.techmahindra.carddispute.notification.controller.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.techmahindra.carddispute.notification.controller.NotificationReceiptController;
import com.techmahindra.carddispute.notification.dto.NotificationReceiptRequest;
import com.techmahindra.carddispute.notification.service.NotificationReceiptService;

import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
public class NotificationReceiptControllerImpl implements NotificationReceiptController {

    private final NotificationReceiptService receiptService;

    @Override
    public ResponseEntity<Void> registerReceipt(NotificationReceiptRequest request) {

        boolean created = receiptService.registerReceipt(request);

        log.info("Notification receipt registered: {}", created);

        return created ? ResponseEntity.status(201).build() : ResponseEntity.ok().build();
    }
}
