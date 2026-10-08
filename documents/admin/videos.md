# Videos

See the list of videos, delete the files of a video or of a revision, and move and rename videos in bulk with a CSV file.

<img src="https://github.com/user-attachments/assets/9c980229-863d-4654-8b34-ed2362e50782" />

## 1. Delete a video

1. Press Delete at the right of the row.
2. Type `Delete` into the confirmation field (same capitalization).
3. Press Delete.

<img src="https://github.com/user-attachments/assets/209cb30a-41d3-4312-a7e5-9e6a20cd113c" />

Note: deleting a video deletes every revision too, and the video leaves the list.  
Note: uploading the same folder key and title again brings it back with its comments, which are not deleted.

## 2. Delete only a revision

1. Open the revisions with the `>` arrow.
2. Press Delete on the revision and confirm by typing `Delete` in the same way.

<img src="https://github.com/user-attachments/assets/6703889a-dde5-4401-957f-b4b484d9be83" />

Note: once a revision is deleted, its video can no longer be watched.

---

## 3. Move and rename videos with a CSV file

Export the videos to a CSV file, edit the folder and title and import it to move and rename videos in one go.

### Export to a CSV file

Press Export above the list to download `videos.csv`.

### Edit the CSV file

| Column | Content |
|---|---|
| id | The video's id (do not change) |
| folder | Folder key<br>Changing it moves the video to that folder |
| title | Title<br>Changing it renames the video |
| files | Where each revision's file is stored (not read on import) |

Rows for videos you do not change can stay as they are or be removed.  
Two videos cannot have the same title in the same folder.

Note: save the file as UTF-8.  
Note: after a move or rename, an upload with the old folder key and title creates a new video.  
Note: if you upload from the CLI or Unity / UE, change the folder key and title they send as well.

### Import the CSV file

1. Press Import above the list.

<img src="https://github.com/user-attachments/assets/16f92c07-0430-4c94-aa96-2189daebd915" />

2. Choose the CSV file and press Import.

<img src="https://github.com/user-attachments/assets/35f28b5b-a19d-4772-8044-c6a9ce8ca87d" />

When the import succeeds, the number of updated videos is shown.  
When there are errors, nothing is applied and a list of the row, column and reason is shown.
