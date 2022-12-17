
### TODO
- download gps log from logger, save locally
    - do it manually via button trigger
    - do it periodically automatically with popup once complete
- splitting gps stream into laps with sector times
- list & display individual laps with sector times
- being able to compare two laps via overlapping graph ✅ and map
- allow drag between multiple maps on graph to compare them better ✅
- have a image of frequent tracks, mapped to gps map so we can overlay line on top of map ✅
    - make solution more generic (use json file in res/tracks)
    - have auto-detection which track a lap belongs to and select map accordingly 
- use main process to handle downloading and processing files instead of renderer
- proximity track detection
- hide/show progress bar at bottom for example when downloading/processing files
- enable adding/removing from lap list (for charts as well as GPS)
- validate if samples are equidistant (required for mapping from screen coordinates to timestamp) and fill if not
- cleanup non used variables / refactor
- optimize rendering logic based on assumption that samples are equidistant (use map of timestamp -> sample mapping)
- refresh lap list after downloading