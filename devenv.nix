{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{

  packages = [ pkgs.git ];
  languages = {
    java = {
      enable = true;
      maven.enable = true;
      jdk.package = pkgs.jdk17;
    };
  };
}
