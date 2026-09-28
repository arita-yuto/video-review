#include "VideoReviewAPI.h"
#include "VideoReviewAPIExecute.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

FString FVideoReviewAPI::ServerUrl;
FString FVideoReviewAPI::ApiToken;
int32 FVideoReviewAPI::TimeoutMs = 300000;
FString FVideoReviewAPI::CliRootOverride;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

TVideoReviewResponse<FVideoReviewGenericResult> FVideoReviewAPI::Bootstrap(const FString& Email, const FString& Password)
{
    return ExecuteObject(TEXT("bootstrap"), { TEXT("--email"), Email, TEXT("--pass"), Password });
}

TVideoReviewResponse<FVideoReviewGenericResult> FVideoReviewAPI::CreateUser(const FString& Name, const FString& Email, const FString& Password)
{
    return ExecuteObject(TEXT("create-user"), { TEXT("--name"), Name, TEXT("--email"), Email, TEXT("--pass"), Password });
}

TVideoReviewResponse<TArray<FVideoReviewVideo>> FVideoReviewAPI::GetVideos(const FString& FilterTree, bool bIncludeRevisions)
{
    TArray<FString> Args = {
        TEXT("--include_revisions"), bIncludeRevisions ? TEXT("true") : TEXT("false"),
        TEXT("--filter_tree"), FilterTree,
    };
    return ExecuteVideoArray(TEXT("get-videos"), Args);
}

TVideoReviewResponse<TArray<FVideoReviewVideoRevision>> FVideoReviewAPI::GetVideosRev(const FString& VideoId)
{
    return ExecuteRevisionArray(TEXT("get-videos-rev"), { TEXT("--video_id"), VideoId });
}

TVideoReviewResponse<TArray<FVideoReviewComment>> FVideoReviewAPI::GetComments(const FString& VideoId)
{
    return ExecuteCommentArray(TEXT("get-comments"), { TEXT("--video_id"), VideoId });
}

TVideoReviewResponse<FVideoReviewVideoRevision> FVideoReviewAPI::UploadVideo(
    const FString& Title,
    const FString& FolderKey,
    const FString& VideoPath,
    const FString& ScenePath,
    const TArray<FString>& VcsWatchPaths)
{
    TArray<FString> Args = {
        TEXT("--title"), Title,
        TEXT("--folder_key"), FolderKey,
        TEXT("--video_path"), VideoPath,
    };
    if (!ScenePath.IsEmpty())
    {
        Args.Add(TEXT("--scene_path"));
        Args.Add(ScenePath);
    }
    if (VcsWatchPaths.Num() > 0)
    {
        Args.Add(TEXT("--vcs_watch_paths"));
        Args.Add(FString::Join(VcsWatchPaths, TEXT(",")));
    }
    return ExecuteRevisionObject(TEXT("upload-video"), Args);
}

TVideoReviewResponse<FVideoReviewSimpleMessage> FVideoReviewAPI::CreateVideoThumbnail(const FString& VideoId)
{
    return ExecuteText(TEXT("create-video-tmb"), { TEXT("--video_id"), VideoId });
}

TVideoReviewResponse<FVideoReviewGenericResult> FVideoReviewAPI::DeleteVideo(const FString& VideoId)
{
    return ExecuteObject(TEXT("delete-video"), { TEXT("--video_id"), VideoId });
}

TVideoReviewResponse<FVideoReviewGenericResult> FVideoReviewAPI::PurgeRev(const FString& VideoId, int32 Revision)
{
    return ExecuteObject(TEXT("purge-revision"), { TEXT("--video_id"), VideoId, TEXT("--revision"), FString::FromInt(Revision) });
}

TVideoReviewResponse<FVideoReviewAnnotateResult> FVideoReviewAPI::AnnotateVideoRev(const FString& VideoRevId)
{
    // The CLI annotates one revision; there is no "all".
    if (VideoRevId.IsEmpty())
    {
        TVideoReviewResponse<FVideoReviewAnnotateResult> Response;
        // StdErr, because that is what the test window shows.
        Response.CommandResult.StdErr = TEXT("video revision id is required");
        return Response;
    }
    return ExecuteAnnotateObject(TEXT("annotate-video-rev"), { TEXT("--video_rev_id"), VideoRevId });
}

TVideoReviewResponse<FVideoReviewSimpleMessage> FVideoReviewAPI::UploadEventContext(const FString& VideoRevId, const FString& JsonPath)
{
    return ExecuteText(TEXT("upload-video-event-context"), { TEXT("--video_rev_id"), VideoRevId, TEXT("--json_path"), JsonPath });
}

TVideoReviewResponse<FVideoReviewSimpleMessage> FVideoReviewAPI::PatchVideo(const FString& VideoId, const TArray<FString>& VcsWatchPaths)
{
    TArray<FString> Args = { TEXT("--video_id"), VideoId };
    if (VcsWatchPaths.Num() > 0)
    {
        Args.Add(TEXT("--vcs_watch_paths"));
        Args.Add(FString::Join(VcsWatchPaths, TEXT(",")));
    }
    return ExecuteText(TEXT("patch-video"), Args);
}

// ---------------------------------------------------------------------------
// Internal execution helpers
// ---------------------------------------------------------------------------

FVideoReviewCommandResult FVideoReviewAPI::Execute(const FString& Command, const TArray<FString>& Args)
{
    return FVideoReviewAPIExecute::Run(Command, Args, ServerUrl, ApiToken, TimeoutMs, CliRootOverride);
}

TVideoReviewResponse<FVideoReviewSimpleMessage> FVideoReviewAPI::ExecuteText(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<FVideoReviewSimpleMessage> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;
    Response.Data.Text = Response.CommandResult.StdOut;
    return Response;
}

TVideoReviewResponse<FVideoReviewGenericResult> FVideoReviewAPI::ExecuteObject(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<FVideoReviewGenericResult> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;

    if (!Response.bSuccess) return Response;

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.CommandResult.StdOut);
    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        Response.bSuccess = false;
        Response.ParseError = TEXT("Failed to parse JSON object");
        return Response;
    }

    JsonObject->TryGetBoolField(TEXT("success"), Response.Data.bSuccess);
    JsonObject->TryGetBoolField(TEXT("ok"), Response.Data.bOk);
    JsonObject->TryGetStringField(TEXT("error"), Response.Data.Error);
    JsonObject->TryGetStringField(TEXT("warning"), Response.Data.Warning);
    JsonObject->TryGetStringField(TEXT("token"), Response.Data.Token);
    JsonObject->TryGetStringField(TEXT("videoId"), Response.Data.VideoId);
    JsonObject->TryGetNumberField(TEXT("revision"), Response.Data.Revision);
    return Response;
}

TVideoReviewResponse<FVideoReviewAnnotateResult> FVideoReviewAPI::ExecuteAnnotateObject(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<FVideoReviewAnnotateResult> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;

    if (!Response.bSuccess) return Response;

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.CommandResult.StdOut);
    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        Response.bSuccess = false;
        Response.ParseError = TEXT("Failed to parse JSON object");
        return Response;
    }

    JsonObject->TryGetNumberField(TEXT("successCount"), Response.Data.SuccessCount);
    JsonObject->TryGetNumberField(TEXT("failureCount"), Response.Data.FailureCount);
    return Response;
}

TVideoReviewResponse<FVideoReviewVideoRevision> FVideoReviewAPI::ExecuteRevisionObject(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<FVideoReviewVideoRevision> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;

    if (!Response.bSuccess) return Response;

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.CommandResult.StdOut);
    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        Response.bSuccess = false;
        Response.ParseError = TEXT("Failed to parse JSON object");
        return Response;
    }

    Response.Data = ParseRevision(JsonObject);
    return Response;
}

TVideoReviewResponse<TArray<FVideoReviewVideo>> FVideoReviewAPI::ExecuteVideoArray(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<TArray<FVideoReviewVideo>> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;

    if (!Response.bSuccess) return Response;

    TArray<TSharedPtr<FJsonValue>> JsonArray;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.CommandResult.StdOut);
    if (!FJsonSerializer::Deserialize(Reader, JsonArray))
    {
        Response.bSuccess = false;
        Response.ParseError = TEXT("Failed to parse JSON array");
        return Response;
    }

    for (const TSharedPtr<FJsonValue>& Value : JsonArray)
    {
        const TSharedPtr<FJsonObject>* Obj;
        if (Value->TryGetObject(Obj))
        {
            Response.Data.Add(ParseVideo(*Obj));
        }
    }
    return Response;
}

TVideoReviewResponse<TArray<FVideoReviewVideoRevision>> FVideoReviewAPI::ExecuteRevisionArray(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<TArray<FVideoReviewVideoRevision>> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;

    if (!Response.bSuccess) return Response;

    TArray<TSharedPtr<FJsonValue>> JsonArray;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.CommandResult.StdOut);
    if (!FJsonSerializer::Deserialize(Reader, JsonArray))
    {
        Response.bSuccess = false;
        Response.ParseError = TEXT("Failed to parse JSON array");
        return Response;
    }

    for (const TSharedPtr<FJsonValue>& Value : JsonArray)
    {
        const TSharedPtr<FJsonObject>* Obj;
        if (Value->TryGetObject(Obj))
        {
            Response.Data.Add(ParseRevision(*Obj));
        }
    }
    return Response;
}

TVideoReviewResponse<TArray<FVideoReviewComment>> FVideoReviewAPI::ExecuteCommentArray(const FString& Command, const TArray<FString>& Args)
{
    TVideoReviewResponse<TArray<FVideoReviewComment>> Response;
    Response.CommandResult = Execute(Command, Args);
    Response.bSuccess = Response.CommandResult.bSuccess;

    if (!Response.bSuccess) return Response;

    TArray<TSharedPtr<FJsonValue>> JsonArray;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.CommandResult.StdOut);
    if (!FJsonSerializer::Deserialize(Reader, JsonArray))
    {
        Response.bSuccess = false;
        Response.ParseError = TEXT("Failed to parse JSON array");
        return Response;
    }

    for (const TSharedPtr<FJsonValue>& Value : JsonArray)
    {
        const TSharedPtr<FJsonObject>* Obj;
        if (Value->TryGetObject(Obj))
        {
            Response.Data.Add(ParseComment(*Obj));
        }
    }
    return Response;
}

// ---------------------------------------------------------------------------
// JSON parsing helpers
// ---------------------------------------------------------------------------

FVideoReviewVideoRevision FVideoReviewAPI::ParseRevision(const TSharedPtr<FJsonObject>& Obj)
{
    FVideoReviewVideoRevision Rev;
    Obj->TryGetStringField(TEXT("id"), Rev.Id);
    Obj->TryGetStringField(TEXT("videoId"), Rev.VideoId);
    Obj->TryGetNumberField(TEXT("revision"), Rev.Revision);
    Obj->TryGetStringField(TEXT("filePath"), Rev.FilePath);
    Obj->TryGetStringField(TEXT("uploadedAt"), Rev.UploadedAt);
    Obj->TryGetBoolField(TEXT("deleted"), Rev.bDeleted);
    Obj->TryGetStringField(TEXT("summary"), Rev.Summary);

    const TArray<TSharedPtr<FJsonValue>>* TagsArray;
    if (Obj->TryGetArrayField(TEXT("tags"), TagsArray))
    {
        for (const TSharedPtr<FJsonValue>& TagVal : *TagsArray)
        {
            FString Tag;
            if (TagVal->TryGetString(Tag)) Rev.Tags.Add(Tag);
        }
    }
    return Rev;
}

FVideoReviewVideo FVideoReviewAPI::ParseVideo(const TSharedPtr<FJsonObject>& Obj)
{
    FVideoReviewVideo Video;
    Obj->TryGetStringField(TEXT("id"), Video.Id);
    Obj->TryGetStringField(TEXT("title"), Video.Title);
    Obj->TryGetStringField(TEXT("folderKey"), Video.FolderKey);
    Obj->TryGetStringField(TEXT("scenePath"), Video.ScenePath);
    Obj->TryGetNumberField(TEXT("latestRevisionNum"), Video.LatestRevisionNum);
    Obj->TryGetBoolField(TEXT("deleted"), Video.bDeleted);

    const TArray<TSharedPtr<FJsonValue>>* RevsArray;
    if (Obj->TryGetArrayField(TEXT("revisions"), RevsArray))
    {
        for (const TSharedPtr<FJsonValue>& RevVal : *RevsArray)
        {
            const TSharedPtr<FJsonObject>* RevObj;
            if (RevVal->TryGetObject(RevObj)) Video.Revisions.Add(ParseRevision(*RevObj));
        }
    }
    return Video;
}

FVideoReviewComment FVideoReviewAPI::ParseComment(const TSharedPtr<FJsonObject>& Obj)
{
    FVideoReviewComment Comment;
    Obj->TryGetStringField(TEXT("id"), Comment.Id);
    Obj->TryGetStringField(TEXT("videoId"), Comment.VideoId);
    Obj->TryGetNumberField(TEXT("videoRevNum"), Comment.VideoRevNum);
    Obj->TryGetStringField(TEXT("userName"), Comment.UserName);
    Obj->TryGetStringField(TEXT("userEmail"), Comment.UserEmail);
    Obj->TryGetStringField(TEXT("comment"), Comment.Comment);
    Obj->TryGetNumberField(TEXT("time"), Comment.Time);
    Obj->TryGetStringField(TEXT("issueId"), Comment.IssueId);
    Obj->TryGetStringField(TEXT("drawingPath"), Comment.DrawingPath);
    Obj->TryGetStringField(TEXT("createdAt"), Comment.CreatedAt);
    Obj->TryGetStringField(TEXT("updatedAt"), Comment.UpdatedAt);
    Obj->TryGetBoolField(TEXT("deleted"), Comment.bDeleted);
    Obj->TryGetNumberField(TEXT("thumbsUp"), Comment.ThumbsUp);
    return Comment;
}
