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

/**
 * Requests in-app store review for a specific event at most once.
 * Returns true if a prompt attempt was made in this call.
 */
export async function requestReviewOnceForEvent(
	event: ReviewTriggerEvent,
): Promise<boolean> {
	try {
		const storeReview = requireOptionalNativeModule<ExpoStoreReviewModule>(
			'ExpoStoreReview',
		);
		if (!storeReview) return false;

		const key = REVIEW_FLAG_KEYS[event];
		const alreadyPrompted = await AsyncStorage.getItem(key);
		if (alreadyPrompted === '1') return false;

		const canRequest = await storeReview.isAvailableAsync();
		if (!canRequest) return false;

		await storeReview.requestReview();
		await AsyncStorage.setItem(key, '1');
		return true;
	} catch {
		return false;
	}
}
