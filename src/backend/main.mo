import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import IntValue "mo:caffeineai-oql/IntValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import TextValue "mo:caffeineai-oql/TextValue";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import BoostTypes "types/boosts";
import AutoTypes "types/auto";
import FfPerfTypes "types/ffperf";
import BoostsApi "mixins/boosts-api";
import AutoApi "mixins/auto-api";
import FfPerfApi "mixins/ffperf-api";
import BoostsOql "lib/boosts-oql";
import AutoOql "lib/auto-oql";
import FfPerfOql "lib/ffperf-oql";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let boosts : Map.Map<Principal, BoostTypes.UserBoosts>;
  let autoSettings : Map.Map<Principal, AutoTypes.AutoSettings>;
  let ffPerfSettings : Map.Map<Principal, FfPerfTypes.FfPerfSettings>;

  include MixinAuthorization(accessControlState, null);
  include BoostsApi(boosts);
  include AutoApi(autoSettings);
  include FfPerfApi(ffPerfSettings);
  include Expose({
    entities = [
      Entity.manual<BoostsOql.BoostRow>(
        "boost",
        func () : Iter.Iter<BoostsOql.BoostRow> { BoostsOql.allRows(boosts) },
        "Boost",
        "id",
      )
        .sample({ id = 0; owner = Principal.fromText("aaaaa-aa"); timestamp = 0 })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("timestamp", func r = r.timestamp)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      Entity.manual<AutoOql.AutoRow>(
        "autoSettings",
        func () : Iter.Iter<AutoOql.AutoRow> { AutoOql.allRows(autoSettings) },
        "AutoSettings",
        "owner",
      )
        .sample({
          owner = Principal.fromText("aaaaa-aa");
          buttonX = 0;
          buttonY = 0;
          swipeDistance = 0;
          gestureDuration = 0;
          pauseBetween = 0;
          shotsPerBurst = 0;
          refreshRate = 0;
          shizukuActive = false;
        })
        .payload("owner", func r = r.owner)
        .payload("buttonX", func r = r.buttonX)
        .payload("buttonY", func r = r.buttonY)
        .payload("swipeDistance", func r = r.swipeDistance)
        .payload("gestureDuration", func r = r.gestureDuration)
        .payload("pauseBetween", func r = r.pauseBetween)
        .payload("shotsPerBurst", func r = r.shotsPerBurst)
        .payload("refreshRate", func r = r.refreshRate)
        .payload("shizukuActive", func r = r.shizukuActive)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      Entity.manual<FfPerfOql.FfPerfRow>(
        "ffPerfSettings",
        func () : Iter.Iter<FfPerfOql.FfPerfRow> { FfPerfOql.allRows(ffPerfSettings) },
        "FfPerfSettings",
        "owner",
      )
        .sample({
          owner = Principal.fromText("aaaaa-aa");
          targetFps = 0;
          cpuGovernor = "";
          ioScheduler = "";
          networkMode = "";
          thermalProfile = "";
        })
        .payload("owner", func r = r.owner)
        .payload("targetFps", func r = r.targetFps)
        .payload("cpuGovernor", func r = r.cpuGovernor)
        .payload("ioScheduler", func r = r.ioScheduler)
        .payload("networkMode", func r = r.networkMode)
        .payload("thermalProfile", func r = r.thermalProfile)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  });
  include ApiDocMixin();
};
