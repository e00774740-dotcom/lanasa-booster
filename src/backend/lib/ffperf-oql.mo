import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/ffperf";

module {
  /// A single FF Performance settings row flattened for OQL, carrying its owner
  /// principal.
  public type FfPerfRow = {
    owner : Principal;
    targetFps : Nat;
    cpuGovernor : Text;
    ioScheduler : Text;
    networkMode : Text;
    thermalProfile : Text;
  };

  /// Flattens every user's FF Performance settings into one iterable of rows.
  public func allRows(
    store : Map.Map<Principal, Types.FfPerfSettings>,
  ) : Iter.Iter<FfPerfRow> {
    let rows = List.empty<FfPerfRow>();
    for ((owner, settings) in store.entries()) {
      rows.add({
        owner;
        targetFps = settings.targetFps;
        cpuGovernor = settings.cpuGovernor;
        ioScheduler = settings.ioScheduler;
        networkMode = settings.networkMode;
        thermalProfile = settings.thermalProfile;
      });
    };
    rows.values();
  };
};
