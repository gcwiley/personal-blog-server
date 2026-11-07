# Common Files within Kubernetes

## Chart.yaml

A `Chart.yaml` file is the metadata manifest for a Helm chart - it's basically the `package.json` equivalent for Kubernetes app packages. Helm reads it to know what the chart is, not how to deploy it - the actual deployment logic lives in the `templates`.

## values.yaml

A `values.yaml` file is the default configuration input for a Helm chart - it's where you define the "knobs" that get substitued in the templates in `templates/` at install/upgrade time, instead of hardcoding things like image names, ports, or replica counts directly into your Kubernetes manifests.

## Why it's useful

* No hardcoding / no duplicatation - change the image tag or replica count in one place instead of editing YAML manifests directly.

* Environmental overrides - you can keep `values.yaml` as sane defaults, then override per-environment with - fix this!

* Self-documenting config surface - anyone deploying the chart can see every configurable option in one file instead of hunting through templates.

## namespace.yaml

In a Helm chart, a `namespace.yaml` template is normally used to declare and create a Kubernetes Namespace object - the logical partition that isolates a group of resources (Deployments, Services, Secrets, etc.) from other groups in the same cluster.
