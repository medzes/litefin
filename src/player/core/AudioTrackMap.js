/**
 * AudioTrackMap — maps a Jellyfin audio stream to a webOS native track position.
 *
 * In DirectPlay the TV builds video.audioTracks itself, independent of Litefin's
 * settings. Observed on webOS:
 *   1. TrueHD tracks are left out (the TV cannot select them natively),
 *   2. the default track is moved to the front,
 *   3. the remaining tracks keep file order.
 *
 * This module applies that rule to the file's audio streams. The result does not
 * depend on the TrueHD or DTS settings, because the TV's list does not either.
 *
 * Kept free of imports so it can be unit-tested without a DOM.
 *
 * @module core/AudioTrackMap
 */

const isTrueHd = (stream) => {
    const codec = String(stream?.Codec || '').toLowerCase();
    return codec === 'truehd' || codec === 'mlp';
};

/**
 * @param {Array<{Index:number, Codec?:string, IsDefault?:boolean}>} jellyfinStreams - Audio
 *        streams in file order
 * @param {number} nativeCount - Length of the TV's native audioTracks list
 * @param {number} targetStreamIndex - Jellyfin stream index being selected
 * @returns {number|null} Native position (>= 0); -1 when the target is a TrueHD track
 *          (not natively selectable); null when the rule does not apply (the counts
 *          do not match, or the target is unknown)
 */
export function mapDefaultFirstAudioIndex(jellyfinStreams, nativeCount, targetStreamIndex) {
    if (!Array.isArray(jellyfinStreams) || jellyfinStreams.length === 0) return null;

    const target = jellyfinStreams.find((s) => s.Index === targetStreamIndex);
    if (!target) return null;
    if (isTrueHd(target)) return -1;

    const nativeStreams = jellyfinStreams.filter((s) => !isTrueHd(s));
    if (nativeCount !== nativeStreams.length) return null;

    const defaultPos = nativeStreams.findIndex((s) => s.IsDefault);
    const ordered = defaultPos > 0
        ? [nativeStreams[defaultPos], ...nativeStreams.slice(0, defaultPos), ...nativeStreams.slice(defaultPos + 1)]
        : nativeStreams;

    const position = ordered.findIndex((s) => s.Index === targetStreamIndex);
    return position >= 0 ? position : null;
}
