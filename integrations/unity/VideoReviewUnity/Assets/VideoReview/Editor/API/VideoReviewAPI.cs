using System;
using System.Collections.Generic;
using UnityEngine;

namespace VideoReview.Editor.API
{
    public static class VideoReviewAPI
    {
        public static string CliRootOverride = null;
        public static string ServerUrl { get; set; } = Environment.GetEnvironmentVariable("VIDEO_REVIEW_SERVER_URL") ?? string.Empty;
        public static string ApiToken { get; set; } =
            Environment.GetEnvironmentVariable("VIDEO_REVIEW_API_TOKEN")
            ?? string.Empty;

        public static int TimeoutMs { get; set; } = 300000;

        // Backward-compatible typo alias.
        public static VideoReviewResponse<VideoReviewGenericResult> Boostrap(string email, string pass)
        {
            return Bootstrap(email, pass);
        }

        public static VideoReviewResponse<VideoReviewGenericResult> Bootstrap(string email, string pass)
        {
            return ExecuteObject<VideoReviewGenericResult>(
                "bootstrap",
                "--email", email,
                "--pass", pass
            );
        }

        public static VideoReviewResponse<VideoReviewGenericResult> CreateUser(string name, string email, string pass)
        {
            return ExecuteObject<VideoReviewGenericResult>(
                "create-user",
                "--name", name,
                "--email", email,
                "--pass", pass
            );
        }

        public static VideoReviewResponse<VideoReviewVideo[]> GetVideos(string filterTree = null, bool includeRevisions = false)
        {
            var args = new List<string>
            {
                "--include_revisions",  includeRevisions ? "true" : "false",
                "--filter_tree", filterTree,
            };

            return ExecuteArray<VideoReviewVideo>("get-videos", args.ToArray());
        }

        public static VideoReviewResponse<VideoReviewVideoRevision[]> GetVideosRev(string videoID)
        {
            return ExecuteArray<VideoReviewVideoRevision>(
                "get-videos-rev",
                "--video_id", videoID
            );
        }

        public static VideoReviewResponse<VideoReviewGenericResult> DeleteVideo(string videoID)
        {
            return ExecuteObject<VideoReviewGenericResult>(
                "delete-video",
                "--video_id", videoID
            );
        }

        public static VideoReviewResponse<VideoReviewGenericResult> PurgeRev(string videoID, int revision = -1)
        {
            return ExecuteObject<VideoReviewGenericResult>(
                "purge-revision",
                "--video_id", videoID,
                "--revision", revision.ToString()
            );
        }

        public static VideoReviewResponse<VideoReviewVideoRevision> UploadVideo(string title, string folderKey, string scenePath, string videoPath, string[] vcsWatchPaths = null)
        {
            var args = new List<string>
            {
                "--title", title,
                "--folder_key", folderKey,
                "--video_path", videoPath,
            };

            if (!string.IsNullOrWhiteSpace(scenePath))
            {
                args.Add("--scene_path");
                args.Add(scenePath);
            }

            if (vcsWatchPaths != null && vcsWatchPaths.Length > 0)
            {
                args.Add("--vcs_watch_paths");
                args.Add(string.Join(",", vcsWatchPaths));
            }

            return ExecuteObject<VideoReviewVideoRevision>("upload-video", args.ToArray());
        }

        public static VideoReviewResponse<VideoReviewSimpleMessage> CreateVideoThumbnail(string videoID)
        {
            return ExecuteText(
                "create-video-tmb",
                "--video_id", videoID
            );
        }

        public static VideoReviewResponse<VideoReviewComment[]> GetComments(string videoID)
        {
            return ExecuteArray<VideoReviewComment>(
                "get-comments",
                "--video_id", videoID
            );
        }

        public static VideoReviewResponse<VideoReviewAnnotateResult> AnnotateVideoRev(string videoRevID, string[] tags = null, string summary = null)
        {
            // The CLI annotates one revision; there is no "all".
            if (string.IsNullOrWhiteSpace(videoRevID))
            {
                return new VideoReviewResponse<VideoReviewAnnotateResult>
                {
                    success = false,
                    parseError = "video revision id is required",
                };
            }

            var args = new List<string>
            {
                "--video_rev_id", videoRevID,
            };

            if (tags != null && tags.Length > 0)
            {
                args.Add("--tags");
                args.Add(string.Join(",", tags));
            }

            if (!string.IsNullOrWhiteSpace(summary))
            {
                args.Add("--summary");
                args.Add(summary);
            }

            return ExecuteObject<VideoReviewAnnotateResult>("annotate-video-rev", args.ToArray());
        }

        public static VideoReviewResponse<VideoReviewSimpleMessage> UploadEventContext(string videoRevID, string jsonPath)
        {
            return ExecuteText(
                "upload-video-event-context",
                "--video_rev_id", videoRevID,
                "--json_path", jsonPath
            );
        }

        public static VideoReviewResponse<VideoReviewSimpleMessage> PatchVideo(string videoID, string[] vcsWatchPaths = null)
        {
            var args = new List<string>
            {
                "--video_id", videoID,
            };

            if (vcsWatchPaths != null && vcsWatchPaths.Length > 0)
            {
                args.Add("--vcs_watch_paths");
                args.Add(string.Join(",", vcsWatchPaths));
            }

            return ExecuteText("patch-video", args.ToArray());
        }

        private static VideoReviewResponse<T> ExecuteObject<T>(string command, params string[] args)
        {
            var result = Execute(command, args);
            var response = new VideoReviewResponse<T>
            {
                success = result.success,
                command = result,
                data = default(T),
                parseError = null,
            };

            if (!result.success)
            {
                return response;
            }

            if (VideoReviewJson.TryParseObject(result.stdOut, out T value, out var parseError))
            {
                response.data = value;
                return response;
            }

            response.parseError = parseError;
            response.success = false;
            return response;
        }

        private static VideoReviewResponse<T[]> ExecuteArray<T>(string command, params string[] args)
        {
            var result = Execute(command, args);
            var response = new VideoReviewResponse<T[]>
            {
                success = result.success,
                command = result,
                data = Array.Empty<T>(),
                parseError = null,
            };

            if (!result.success)
            {
                return response;
            }

            if (VideoReviewJson.TryParseArray(result.stdOut, out T[] values, out var parseError))
            {
                response.data = values;
                return response;
            }

            response.parseError = parseError;
            response.success = false;
            return response;
        }

        private static VideoReviewResponse<VideoReviewSimpleMessage> ExecuteText(string command, params string[] args)
        {
            var result = Execute(command, args);
            return new VideoReviewResponse<VideoReviewSimpleMessage>
            {
                success = result.success,
                command = result,
                data = new VideoReviewSimpleMessage { text = result.stdOut?.Trim() ?? string.Empty },
                parseError = null,
            };
        }

        private static VideoReviewCommandResult Execute(string command, params string[] args)
        {
            try
            {
                var result = VideoReviewAPIExecute.Run(
                    command,
                    args,
                    ServerUrl,
                    ApiToken,
                    TimeoutMs,
                    CliRootOverride
                );

                if (!result.success)
                {
                    Debug.LogError($"[VideoReview] CLI failed: {command}\n{result.stdErr}");
                }

                return result;
            }
            catch (Exception e)
            {
                Debug.LogError($"[VideoReview] CLI execution error: {e.Message}");
                return new VideoReviewCommandResult
                {
                    success = false,
                    timedOut = false,
                    exitCode = -1,
                    command = command,
                    stdOut = string.Empty,
                    stdErr = e.ToString(),
                };
            }
        }
    }
}
