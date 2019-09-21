# app-handshake/example

```shell
export DEBUG=devebot*,app*
export LOGOLITE_DEBUGLOG_ENABLED=true
export DEVEBOT_TEXTURE=messender
```

Apply the presetOTPs in configuration:

```shell
export DEVEBOT_SANDBOX=fixedotp
```

Launch the server:

```shell
node test/app
```
