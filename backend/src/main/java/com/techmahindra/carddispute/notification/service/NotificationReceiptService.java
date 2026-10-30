package com.techmahindra.carddispute.notification.service;

import com.techmahindra.carddispute.notification.dto.NotificationReceiptRequest;

public interface NotificationReceiptService {

    boolean registerReceipt(NotificationReceiptRequest request);
}
