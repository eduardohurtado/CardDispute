package com.techmahindra.carddispute.notification.service;

import com.techmahindra.carddispute.notification.dto.DisputeResolvedEvent;

public interface NotificationOutboxService {

    void saveDisputeResolvedEvent(DisputeResolvedEvent event);
}
