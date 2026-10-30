import type { VehicleProps } from "../shared/vehicleProps"

const MOD_TYPES = Array.from({ length: 50 }, (_, i) => i)
const TOGGLE_MODS = [17, 18, 19, 20, 21, 22]

/** Reads every property of a vehicle the local client can see. */
export function getVehicleProps(vehicle: number): VehicleProps {
  const [primary, secondary] = GetVehicleColours(vehicle)
  const [pearl, wheel] = GetVehicleExtraColours(vehicle)
  const mods: Record<number, number> = {}
  for (const type of MOD_TYPES) {
    if (TOGGLE_MODS.includes(type))
      mods[type] = IsToggleModOn(vehicle, type) ? 1 : 0
    else mods[type] = GetVehicleMod(vehicle, type)
  }
  const extras: Record<number, boolean> = {}
  for (let id = 0; id <= 14; id++)
    if (DoesExtraExist(vehicle, id))
      extras[id] = IsVehicleExtraTurnedOn(vehicle, id)
  const custom = (
    get: (v: number) => [number, number, number],
    has: boolean
  ) => (has ? get(vehicle) : null)
  return {
    v: 1,
    model: GetEntityModel(vehicle),
    plate: GetVehicleNumberPlateText(vehicle).trim(),
    plateIndex: GetVehicleNumberPlateTextIndex(vehicle),
    colors: [primary ?? 0, secondary ?? 0],
    extraColors: [pearl ?? 0, wheel ?? 0],
    customPrimary: custom(
      GetVehicleCustomPrimaryColour,
      GetIsVehiclePrimaryColourCustom(vehicle)
    ),
    customSecondary: custom(
      GetVehicleCustomSecondaryColour,
      GetIsVehicleSecondaryColourCustom(vehicle)
    ),
    wheelType: GetVehicleWheelType(vehicle),
    windowTint: GetVehicleWindowTint(vehicle),
    livery: GetVehicleLivery(vehicle),
    mods,
    xenonColor: GetVehicleXenonLightsColor(vehicle),
    neon: [0, 1, 2, 3].map((i) =>
      IsVehicleNeonLightEnabled(vehicle, i)
    ) as VehicleProps["neon"],
    neonColor: GetVehicleNeonLightsColour(vehicle),
    tyreSmoke: GetVehicleTyreSmokeColor(vehicle),
    extras,
    dirt: GetVehicleDirtLevel(vehicle),
    engineHealth: GetVehicleEngineHealth(vehicle),
    bodyHealth: GetVehicleBodyHealth(vehicle),
  }
}

/** Applies stored properties (only to a vehicle this client controls; others get them through the network). */
export function setVehicleProps(vehicle: number, props: VehicleProps): void {
  SetVehicleModKit(vehicle, 0)
  SetVehicleNumberPlateText(vehicle, props.plate)
  SetVehicleNumberPlateTextIndex(vehicle, props.plateIndex)
  SetVehicleColours(vehicle, props.colors[0], props.colors[1])
  SetVehicleExtraColours(vehicle, props.extraColors[0], props.extraColors[1])
  if (props.customPrimary)
    SetVehicleCustomPrimaryColour(vehicle, ...props.customPrimary)
  if (props.customSecondary)
    SetVehicleCustomSecondaryColour(vehicle, ...props.customSecondary)
  SetVehicleWheelType(vehicle, props.wheelType)
  SetVehicleWindowTint(vehicle, props.windowTint)
  for (const [type, index] of Object.entries(props.mods)) {
    const t = Number(type)
    if (TOGGLE_MODS.includes(t)) ToggleVehicleMod(vehicle, t, index === 1)
    else SetVehicleMod(vehicle, t, index, false)
  }
  SetVehicleLivery(vehicle, props.livery)
  SetVehicleXenonLightsColor(vehicle, props.xenonColor)
  props.neon.forEach((on, i) => SetVehicleNeonLightEnabled(vehicle, i, on))
  SetVehicleNeonLightsColour(vehicle, ...props.neonColor)
  SetVehicleTyreSmokeColor(vehicle, ...props.tyreSmoke)
  for (const [id, on] of Object.entries(props.extras))
    SetVehicleExtra(vehicle, Number(id), !on)
  SetVehicleDirtLevel(vehicle, props.dirt)
  SetVehicleEngineHealth(vehicle, props.engineHealth)
  SetVehicleBodyHealth(vehicle, props.bodyHealth)
}
