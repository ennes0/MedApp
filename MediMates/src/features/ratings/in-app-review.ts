import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type ReviewTriggerEvent = 'medication_added' | 'mate_found';

const REVIEW_FLAG_KEYS: Record<ReviewTriggerEvent, string> = {
	medication_added: 'review_prompted_medication_added_v1',
	mate_found: 'review_prompted_mate_found_v1',
};

interface ExpoStoreReviewModule {
	isAvailableAsync: () => Promise<boolean>;
	requestReview: () => Promise<void>;
}

function getReviewFlagKey(event: ReviewTriggerEvent, userId?: string): string {
	return userId ? `${REVIEW_FLAG_KEYS[event]}_${userId}` : REVIEW_FLAG_KEYS[event];
}

export async function hasSeenReviewPromptForEvent(
	event: ReviewTriggerEvent,
	userId?: string,
): Promise<boolean> {
	const key = getReviewFlagKey(event, userId);
	const alreadyPrompted = await AsyncStorage.getItem(key);
	return alreadyPrompted === '1';
}

export async function markReviewPromptSeenForEvent(
	event: ReviewTriggerEvent,
	userId?: string,
): Promise<void> {
	const key = getReviewFlagKey(event, userId);
	await AsyncStorage.setItem(key, '1');
}

export async function requestNativeReview(): Promise<boolean> {
	const storeReview = requireOptionalNativeModule<ExpoStoreReviewModule>(
		'ExpoStoreReview',
	);
	if (!storeReview) return false;

	const canRequest = await storeReview.isAvailableAsync();
	if (!canRequest) return false;

	await storeReview.requestReview();
	return true;
}

/**
 * Requests in-app store review for a specific event at most once.
 * Returns true if a prompt attempt was made in this call.
 */
export async function requestReviewOnceForEvent(
	event: ReviewTriggerEvent,
	userId?: string,
): Promise<boolean> {
	try {
		const alreadyPrompted = await hasSeenReviewPromptForEvent(event, userId);
		if (alreadyPrompted) return false;

		const requested = await requestNativeReview();
		if (!requested) return false;

		await markReviewPromptSeenForEvent(event, userId);
		return true;
	} catch {
		return false;
	}
}
