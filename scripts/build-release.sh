#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('${project_root}/package.json').version")"
image="roamdial-app:${version}"
fnpack_bin="${FNPACK_BIN:-fnpack}"
output_dir="${project_root}/artifacts"
staging_dir="$(mktemp -d "${TMPDIR:-/tmp}/roamdial-release.XXXXXX")"

cleanup() {
    rm -rf "${staging_dir}"
}
trap cleanup EXIT

if ! command -v "${fnpack_bin}" >/dev/null 2>&1; then
    echo "fnpack was not found. Install fnpack 1.2.3 or set FNPACK_BIN." >&2
    exit 1
fi

mkdir -p "${output_dir}"
rm -f \
    "${output_dir}/roamdial-app-linux-amd64.tar.gz" \
    "${output_dir}/roamdial-app-linux-arm64.tar.gz" \
    "${output_dir}/roamdial-fnos-x86.fpk" \
    "${output_dir}/roamdial-fnos-arm.fpk" \
    "${output_dir}/roamdial-docker-compose.yaml" \
    "${output_dir}/SHA256SUMS"

build_platform() {
    local fnos_platform="$1"
    local docker_arch="$2"
    local docker_platform="linux/${docker_arch}"
    local package_name="roamdial-fnos-${fnos_platform}"
    local package_dir="${staging_dir}/${package_name}"

    echo "Building ${image} for ${docker_platform}"
    docker buildx build \
        --platform "${docker_platform}" \
        --load \
        --tag "${image}" \
        "${project_root}"

    docker save "${image}" | gzip -9 > "${output_dir}/roamdial-app-${docker_platform//\//-}.tar.gz"

    cp -R "${project_root}/deploy/fnos/roamdial" "${package_dir}"
    mkdir -p "${package_dir}/app/images"
    gunzip -c "${output_dir}/roamdial-app-${docker_platform//\//-}.tar.gz" \
        > "${package_dir}/app/images/roamdial-image.tar"
    # manifest 的 version 与 platform 始终跟随 package.json / 目标架构，避免手工漂移
    sed -i.bak \
        -e "s/^version *= *.*/version = ${version}/" \
        -e "s/^platform *= *.*/platform = ${fnos_platform}/" \
        "${package_dir}/manifest"
    rm -f "${package_dir}/manifest.bak"
    find "${package_dir}" -name .DS_Store -delete

    (cd "${package_dir}" && "${fnpack_bin}" build)
    local built_package
    built_package="$(find "${package_dir}" -maxdepth 1 -name '*.fpk' -print -quit)"
    if [ -z "${built_package}" ]; then
        echo "fnpack did not create an FPK for ${fnos_platform}." >&2
        exit 1
    fi
    cp "${built_package}" "${output_dir}/roamdial-fnos-${fnos_platform}.fpk"
}

build_platform x86 amd64
build_platform arm arm64
cp "${project_root}/deploy/compose.yaml" "${output_dir}/roamdial-docker-compose.yaml"

(
    cd "${output_dir}"
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 \
            roamdial-app-linux-amd64.tar.gz \
            roamdial-app-linux-arm64.tar.gz \
            roamdial-fnos-x86.fpk \
            roamdial-fnos-arm.fpk \
            roamdial-docker-compose.yaml \
            > SHA256SUMS
    else
        sha256sum \
            roamdial-app-linux-amd64.tar.gz \
            roamdial-app-linux-arm64.tar.gz \
            roamdial-fnos-x86.fpk \
            roamdial-fnos-arm.fpk \
            roamdial-docker-compose.yaml \
            > SHA256SUMS
    fi
)

echo "Release artifacts written to ${output_dir}"
