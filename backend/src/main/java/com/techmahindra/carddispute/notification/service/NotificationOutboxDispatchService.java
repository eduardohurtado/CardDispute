package com.techmahindra.carddispute.notification.service;

public interface NotificationOutboxDispatchService {

    int publishPendingBatch();
}
