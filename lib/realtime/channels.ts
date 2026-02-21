/**
 * PRD Real-time Sync Rules에 따른 채널 명명 규칙
 */

export const getMessageChannel = (inviteId: string) => {
    return `messages:room-${inviteId}`;
};

export const getInvitationChannel = (userId: string) => {
    return `invitation:user-${userId}`;
};

/**
 * 특정 그룹(학교/지역 등)의 요청 목록을 위한 채널
 * 현재는 특정 학교나 그룹 ID가 명확하지 않으므로 전체 요청용 글로벌 채널 또는 pool 기반으로 확장 가능
 */
export const getRequestsGroupChannel = (groupId: string = "global") => {
    return `requests:group-${groupId}`;
};

export const getTripChannel = (tripId: string) => {
    return `trips:id-${tripId}`;
};

export const getPickupRequestChannel = (requestId: string) => {
    return `pickup_requests:id-${requestId}`;
};
