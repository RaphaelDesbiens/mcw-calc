# Sulfur cube experiment fixtures

`je26_2MeleeEndpointValidation.csv` contains the 100 completed Java Edition 26.2
player-melee validation cases recorded on 2026-09-02. The source artifacts are:

- `minecraft-je-research/notes/in-game-data/sulfur_cube_endpoint/command_storage.dat`
- `minecraft-je-research/notes/in-game-data/sulfur_cube_endpoint/protocol-iterations/je26_2-melee-accuracy-matrix-accurate`

The `predicted_*` columns preserve the former Standard-backend results rounded
to six decimal places. The `actual_*` columns are the full-precision stable
feet positions decoded from command storage after 40 unchanged samples. The
fixture deliberately excludes harness bookkeeping that does not affect model
evaluation.
