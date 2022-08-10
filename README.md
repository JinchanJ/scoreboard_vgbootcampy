# New Overlay:
- Download the zip file and open it.
- Move the scoreboard_new file (probably named scoreboard_new-main) into the /layout folder of TSH where all the other scoreboard files are located.
- Go to OBS and add a new Browser
- Select the scoreboard_new-main/ssbultimate.html as the local file and set width and height to 1920 and 1080 respectively.
- Run TSH and enter player information.
  - Note: The Browser in OBS may need to be refreshed for the information to appear properly.
  
# Player Cams:
- Included in the scoreboard_new file are the CameraBorders.png and CameraMask.png.
- Add CameraBorders.png as Image in OBS to set the camera borders.
  - Note: Change the color of the border by adding the color correction filter to the image.
- Add Image Mask/Blend filter to the player cam and select CameraMask.png as its path to round the corners of the player cam.
- Move the player cams so they fit nicely within their borders.
