# Drakarnas komposition

`dragons.json` är katalogen. Varje `index.ts` väljer uttryckligen domänens policy och eventuella
verksamhetsfält. En SM-drake måste välja en komplett `SupportErrandPolicy`; MEX/PT väljer null.
En delad preset väljs vid namn. Drakar importerar inte varandra.

För en ny drake: lägg till katalogpost, modul och registrering i `shell/dragon-registry.ts`.
Välj och testa de domänkontrakt som draken behöver. Följ repositoryts befintliga miljö- och
startkonventioner; katalogregistrering skapar inte automatiskt en deployment eller behörighet.

Se [grunden och importgränserna](../../../../docs/architecture/boundaries.md).
