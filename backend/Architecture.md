
## AI girlfriend 

This application is power by Artificial inteligence 

# Model 

LLM 
TTS 
Realtime - web socket 

# Architecture 

React 
-> (web socket)
NestJs 
-> stream token from LLM 
-> stream text to ElevenLabs /stream/with-timestamp
-> forward audio + alightment 
React client play audio + hightlight text in real time
